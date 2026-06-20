# Generated for SIS ENSET v11.1 dynamic premium policy
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('premium', '0003_auditpremium'),
    ]

    operations = [
        migrations.AddField(
            model_name='planacces',
            name='ancien_prix',
            field=models.PositiveIntegerField(blank=True, help_text='Prix barré affiché en période promotionnelle', null=True),
        ),
        migrations.AddField(
            model_name='planacces',
            name='badge',
            field=models.CharField(blank=True, help_text='Exemple : Promo, Recommande, Lancement', max_length=80),
        ),
        migrations.AddField(
            model_name='planacces',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='parametrespremium',
            name='message_annonce',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='parametrespremium',
            name='pourcentage_auteur',
            field=models.DecimalField(decimal_places=2, default=Decimal('30.00'), max_digits=5),
        ),
        migrations.AddField(
            model_name='parametrespremium',
            name='quota_documents_gratuits_mensuel',
            field=models.PositiveIntegerField(default=3),
        ),
        migrations.AlterField(
            model_name='auditpremium',
            name='action',
            field=models.CharField(choices=[('PAIEMENT_CREE', 'Paiement cree'), ('PAIEMENT_VALIDE', 'Paiement valide'), ('PAIEMENT_REJETE', 'Paiement rejete'), ('PARAMETRES_MODIFIES', 'Parametres modifies'), ('RECU_TELECHARGE', 'Recu telecharge'), ('EXPORT_PAIEMENTS', 'Export paiements'), ('CONSULTATION_STATS', 'Consultation statistiques'), ('PLAN_MODIFIE', 'Plan premium modifie'), ('PROMOTION_CREEE', 'Promotion creee'), ('PROMOTION_MODIFIEE', 'Promotion modifiee')], max_length=40),
        ),
        migrations.CreateModel(
            name='PromotionPremium',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titre', models.CharField(max_length=150)),
                ('message', models.TextField()),
                ('date_debut', models.DateTimeField(blank=True, null=True)),
                ('date_fin', models.DateTimeField(blank=True, null=True)),
                ('memoires_gratuits', models.BooleanField(default=False)),
                ('documents_gratuits', models.BooleanField(default=False)),
                ('actif', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('cree_par', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotions_premium_creees', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Promotion premium',
                'verbose_name_plural': 'Promotions premium',
                'ordering': ['-actif', '-created_at'],
            },
        ),
    ]
