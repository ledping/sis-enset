# Generated for SIS ENSET v9.3
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('premium', '0002_parametres_premium'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditPremium',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('PAIEMENT_CREE', 'Paiement cree'), ('PAIEMENT_VALIDE', 'Paiement valide'), ('PAIEMENT_REJETE', 'Paiement rejete'), ('PARAMETRES_MODIFIES', 'Parametres modifies'), ('RECU_TELECHARGE', 'Recu telecharge'), ('EXPORT_PAIEMENTS', 'Export paiements'), ('CONSULTATION_STATS', 'Consultation statistiques')], max_length=40)),
                ('description', models.TextField(blank=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('acteur', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audits_premium_effectues', to=settings.AUTH_USER_MODEL)),
                ('paiement', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audits', to='premium.paiementacces')),
                ('utilisateur_cible', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audits_premium_subis', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Audit premium',
                'verbose_name_plural': 'Audits premium',
                'ordering': ['-created_at'],
            },
        ),
    ]
