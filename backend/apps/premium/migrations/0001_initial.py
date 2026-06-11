# Generated for SIS ENSET v9.0 premium
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_default_plans(apps, schema_editor):
    PlanAcces = apps.get_model('premium', 'PlanAcces')
    plans = [
        {
            'nom': 'Pack Documents',
            'type_plan': 'DOCUMENT',
            'description': '1 credit document donnant droit a 5 telechargements supplementaires.',
            'prix': 500,
            'credits_documents': 5,
            'credits_memoires': 0,
            'ordre': 1,
        },
        {
            'nom': 'Pack Memoire',
            'type_plan': 'MEMOIRE',
            'description': '1 credit memoire pour telecharger un memoire complet.',
            'prix': 500,
            'credits_documents': 0,
            'credits_memoires': 1,
            'ordre': 2,
        },
        {
            'nom': 'Pack Recherche',
            'type_plan': 'MIXTE',
            'description': 'Pack avantageux pour recherches academiques : 5 memoires et 10 documents.',
            'prix': 2500,
            'credits_documents': 10,
            'credits_memoires': 5,
            'ordre': 3,
        },
    ]
    for plan in plans:
        PlanAcces.objects.get_or_create(nom=plan['nom'], defaults=plan)


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('documents', '0001_initial'),
        ('memoires', '0005_alter_memoire_resume'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlanAcces',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=120)),
                ('type_plan', models.CharField(choices=[('DOCUMENT', 'Pack documents'), ('MEMOIRE', 'Pack memoires'), ('MIXTE', 'Pack mixte')], default='DOCUMENT', max_length=20)),
                ('description', models.TextField(blank=True)),
                ('prix', models.PositiveIntegerField(help_text='Prix en FCFA')),
                ('credits_documents', models.PositiveIntegerField(default=0, help_text='Nombre de telechargements documents accordes')),
                ('credits_memoires', models.PositiveIntegerField(default=0, help_text='Nombre de telechargements memoires accordes')),
                ('actif', models.BooleanField(default=True)),
                ('ordre', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'verbose_name': 'Plan d acces', 'verbose_name_plural': 'Plans d acces', 'ordering': ['ordre', 'prix']},
        ),
        migrations.CreateModel(
            name='PortefeuilleUtilisateur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('telechargements_documents_credits', models.PositiveIntegerField(default=0)),
                ('credits_memoires', models.PositiveIntegerField(default=0)),
                ('total_depense', models.PositiveIntegerField(default=0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('utilisateur', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='portefeuille_premium', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Portefeuille premium', 'verbose_name_plural': 'Portefeuilles premium'},
        ),
        migrations.CreateModel(
            name='PaiementAcces',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('montant', models.PositiveIntegerField()),
                ('moyen', models.CharField(choices=[('MTN_MOMO', 'MTN Mobile Money'), ('ORANGE_MONEY', 'Orange Money'), ('BANQUE', 'Depot bancaire'), ('CAISSE', 'Caisse departementale'), ('AUTRE', 'Autre')], max_length=30)),
                ('numero_payeur', models.CharField(blank=True, max_length=40)),
                ('reference', models.CharField(blank=True, max_length=120)),
                ('preuve', models.FileField(blank=True, null=True, upload_to='premium/preuves/')),
                ('commentaire', models.TextField(blank=True)),
                ('statut', models.CharField(choices=[('EN_ATTENTE', 'En attente'), ('VALIDE', 'Valide'), ('REJETE', 'Rejete')], default='EN_ATTENTE', max_length=20)),
                ('motif_rejet', models.TextField(blank=True)),
                ('date_validation', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('plan', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='paiements', to='premium.planacces')),
                ('utilisateur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='paiements_premium', to=settings.AUTH_USER_MODEL)),
                ('valide_par', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='paiements_premium_valides', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Paiement premium', 'verbose_name_plural': 'Paiements premium', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='AchatMemoire',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('montant_estime', models.PositiveIntegerField(default=500)),
                ('part_auteur_estimee', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10)),
                ('pourcentage_auteur', models.DecimalField(decimal_places=2, default=Decimal('30.00'), max_digits=5)),
                ('credit_utilise', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('memoire', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='achats_premium', to='memoires.memoire')),
                ('utilisateur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='achats_memoires', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Achat de memoire', 'verbose_name_plural': 'Achats de memoires', 'ordering': ['-created_at'], 'unique_together': {('utilisateur', 'memoire')}},
        ),
        migrations.CreateModel(
            name='HistoriqueTelechargement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_ressource', models.CharField(choices=[('DOCUMENT', 'Document'), ('MEMOIRE', 'Memoire')], max_length=20)),
                ('gratuit', models.BooleanField(default=False)),
                ('via_credit', models.BooleanField(default=False)),
                ('commentaire', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('document', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='historiques_premium', to='documents.document')),
                ('memoire', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='historiques_premium', to='memoires.memoire')),
                ('utilisateur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='telechargements_premium', to=settings.AUTH_USER_MODEL)),
            ],
            options={'verbose_name': 'Historique de telechargement', 'verbose_name_plural': 'Historiques de telechargement', 'ordering': ['-created_at']},
        ),
        migrations.RunPython(create_default_plans, migrations.RunPython.noop),
    ]
